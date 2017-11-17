function robotsParse(txt,url,ua="Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)") =>
{
	let lines = txt.split("\n");
	let last_valid_key = "";
	let last_valid_value = "";
	let last_user_agent = "";
	let user_agent_group = [];
	let ua_lower = ua.toLowerCase();
	let URL_Object = new URL(url);
	let path = URL_Object.pathname;
	let all_matches = new Map();

	let mapAscByKey = (map) =>
	{
		return new Map([...map.entries()].sort((a,b) => a[0] > b[0] ? 1 : a[0] < b[0] ? -1 : 0));
	}

	let mapDscByKey = (map) =>
	{
		return new Map([...map.entries()].sort((a,b) => a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0));
	}

	let saveLast = (key,value) =>
	{
		last_valid_key = key;
		last_valid_value = value;
		return {key,value}
	}

	let specialEscape = (str)=>
	{
    	let specials = new RegExp("[.+?|()\\[\\]{}\\\\]", "g");
    	return str.replace(specials, "\\$&");
  	}

  	//let inUserAgentGroup = ()=>
  	
  	let doesUserAgentMatch = (user_agent = ua_lower, ua_group =  user_agent_group)=>
  	{
  		let user_agent_match = false;
		for(u of ua_group)
		{
			if(u!=''&&(user_agent.includes(u) || u === '*'))
			{
				user_agent_match = true;
			}
		}
		return user_agent_match;
  	}

  	let doesItMatch = (it,what,rule,line,linenr,ua,user_agent_group) =>
  	{
  						let reg_ex_st = specialEscape(rule);
						reg_ex_st = reg_ex_st.replace(/\*/g, '.*');
						if(!reg_ex_st.endsWith('$')&&!reg_ex_st.endsWith('*'))
						{
							reg_ex_st=reg_ex_st+'.*'
						}
						reg_ex_st = '^'+reg_ex_st
						let rx = new RegExp(reg_ex_st);
						if(path.match(rx))
						{
							console.log('it is a match');
							return(
								{
									'prio':rule.length,
									'linenumber':linenr,
									'rule':line,
									'regex':reg_ex_st,
									'key':what,
									'value':rule,
									'user-agent': ua,
									'user-agent-match':user_agent_group
								}
							)
						}
  	}

  	let nr = 0;
	for (let l of lines)
	{
		nr++;
		let lt = l.trim();
		//blankline
		if(lt==="")
		{
			;
		}
		else if(lt.startsWith('#')) //commentline
		{
			;
		}
		else if(lt.includes(':')) //a pot instrctuins line
		{
			//get rid of comments
			if(lt.includes('#'))
			{
				lt=lt.substring(0,lt.indexOf('#'));
			}
			let key = lt.substring(0,lt.indexOf(':')).trim();
			let value = lt.substring(lt.indexOf(':')+1).trim();
			key = key.toLowerCase();
			saveLast(key,value);
			if (key==="user-agent")
			{
				last_user_agent = value;
				if(last_valid_key==='user-agent')
				{
					user_agent_group.push(value)
				}
				else
				{
					user_agent_group = [];
					user_agent_group.push(value);
				}
				//debugger;
			} else
			if (key==="disallow" || key === "allow" || key === "noindex")
			{
				//look if our user agent matches a user agent in the current user agent group
				if(user_agent_group.length>0)
				{
					if(doesUserAgentMatch(ua_lower,user_agent_group))
					{
						let a_match = doesItMatch(path,key,value,lt,nr,ua,user_agent_group)
						if(a_match)
						{
							//all_matches.push(a_match);
							if(!all_matches.get(a_match.prio))
							{
								all_matches.set(a_match.prio,[a_match])
							}
							else
							{
								all_matches.get(a_match.prio).push(a_match);
							}
						}
						else
						{
							console.log("not a match");
						}
					}

				}
			} else
			if (key==="crawl-delay")
			{
				//todo
			} else
			if (key==="sitemap")
			{
				//todo
			} else
			if (key==="host")
			{
				; //yandex only, ignored currently
			}
		}
	}
	let prio_matches = mapDscByKey(all_matches);
	let r = {
		matches: prio_matches,
		allowed: true,
		disallowed: false,
		noindex: false,
		rule_match: false,
		conflict: false
	}


	if(prio_matches.size>0)
	{
		r.rule_match = true;
		let highest_matching_rules = prio_matches.values().next().value;
		let activly_set_to_allow = false;
		let activly_set_to_disallow = false;
		for(let m of highest_matching_rules)
		{
			if(m.key==='disallow')
			{
				r.disallowed = true;
				r.allowed= false;
				activly_set_to_disallow = true;
			}
			if(m.key==='allow')
			{
				activly_set_to_allow = true;
			}
		}
		if(activly_set_to_allow&&activly_set_to_disallow)
		{
			r.conflict=true;
		}

		//if there is any match of noindex, we set the noindex flag
		for (let [mk,mv] of prio_matches)
		{
			for(let mmv of mv)
			{
				if(mmv.key==='noindex')
				{
					r.noindex = true;
				}
			}
		}
	}
	return r;
}

module.exports = robotsParse;